"use client";

import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WizardShell } from "@/components/school-setup/wizard/WizardShell";
import { useSetupStatus, useCompleteSetup } from "@/hooks/useSchoolSetup";
import { useSchoolUnits } from "@/hooks/useSchoolUnits";
import { useProgrammes } from "@/hooks/useProgrammes";
import { useGrades } from "@/hooks/useGrades";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { useClasses } from "@/hooks/useClasses";
import { useSubjects } from "@/hooks/useSubjects";
import { useTerms } from "@/hooks/useTerms";
import { useActiveAcademicYear } from "@/contexts/ActiveAcademicYearContext";

// ── Mode B — post-completion prompt card ────────────────────────────

type PromptCard = {
  title: string;
  description: string;
  href: string;
  label: string;
};

const POST_COMPLETION_PROMPTS: PromptCard[] = [
  {
    title: "Configure your holiday calendar",
    description: "Add public holidays and school breaks to the calendar.",
    href: "/holidays",
    label: "Go to Holidays",
  },
  {
    title: "Assign class teachers",
    description: "Assign a primary teacher to each class section.",
    href: "/teachers",
    label: "Go to Teachers",
  },
];

// ── Mode A — summary card row ────────────────────────────────────────

type SummaryCardProps = {
  title: string;
  value: string;
  ready: boolean;
};

function SummaryCard({ title, value, ready }: SummaryCardProps) {
  return (
    <Card>
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p
          className={
            ready ? "text-sm font-semibold" : "text-sm text-muted-foreground"
          }
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export default function CompletePage() {
  const { data: setupStatus, isLoading: statusLoading } = useSetupStatus();
  const completeMutation = useCompleteSetup();

  const { academicYearId } = useActiveAcademicYear();

  // Module data for summary counts
  const { data: units = [] } = useSchoolUnits();
  const { data: programmes = [] } = useProgrammes();
  const { data: grades = [] } = useGrades();
  const { data: academicYears = [] } = useAcademicYears(false);
  const { data: classesData } = useClasses();
  const { data: subjects = [] } = useSubjects();
  const { data: terms = [] } = useTerms(academicYearId ?? undefined);

  const isSetupComplete =
    setupStatus?.overall?.is_setup_complete === true;

  // Derive class count from query data (classesData may be array directly)
  const classCount = Array.isArray(classesData) ? classesData.length : 0;

  // Active academic year name
  const activeYear = academicYears.find((y) => y.is_active);

  // canMark: all required modules (units, programmes, grades, academic_year,
  // classes, subjects) have count > 0 or ready === true
  const canMark =
    !!(setupStatus?.units?.ready || (setupStatus?.units?.count ?? 0) > 0) &&
    !!(
      setupStatus?.programmes?.ready ||
      (setupStatus?.programmes?.count ?? 0) > 0
    ) &&
    !!(setupStatus?.grades?.ready || (setupStatus?.grades?.count ?? 0) > 0) &&
    !!(
      setupStatus?.academic_year?.ready ||
      setupStatus?.academic_year?.active_id
    ) &&
    !!(
      setupStatus?.classes?.ready ||
      (setupStatus?.classes?.count ?? 0) > 0
    ) &&
    !!(
      setupStatus?.subjects?.ready ||
      (setupStatus?.subjects?.count ?? 0) > 0
    );

  const handleMarkComplete = async () => {
    try {
      await completeMutation.mutateAsync();
      toast.success("Setup marked as complete!");
    } catch {
      toast.error("Failed to complete setup. Please try again.");
    }
  };

  // ── Mode B: already complete ─────────────────────────────────────

  if (isSetupComplete) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-8 p-6">
        {/* Celebration card */}
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardContent className="flex items-center gap-4 py-8 px-6">
            <CheckCircle2 className="size-12 shrink-0 text-green-600 dark:text-green-400" />
            <div>
              <h1 className="text-2xl font-semibold text-green-900 dark:text-green-100">
                Setup complete 🎉
              </h1>
              <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                Your school is configured and ready to use.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Post-completion prompts */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            What&apos;s next?
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Multi-campus admin prompt — only show if more than one unit */}
            {units.length > 1 && (
              <Card>
                <CardContent className="flex flex-col gap-3 py-5 px-5">
                  <div>
                    <p className="font-medium text-sm">
                      Invite admins for other campuses?
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You have {units.length} campuses — assign dedicated admins
                      for each.
                    </p>
                  </div>
                  <Button asChild size="sm" className="self-start gap-1.5">
                    <Link href="/users">
                      Go to Users
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {POST_COMPLETION_PROMPTS.map((card) => (
              <Card key={card.href}>
                <CardContent className="flex flex-col gap-3 py-5 px-5">
                  <div>
                    <p className="font-medium text-sm">{card.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {card.description}
                    </p>
                  </div>
                  <Button asChild size="sm" className="self-start gap-1.5">
                    <Link href={card.href}>
                      {card.label}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <div className="flex justify-center">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── Mode A: not yet complete ─────────────────────────────────────

  return (
    <WizardShell
      stepKey="complete"
      canContinue={canMark && !completeMutation.isPending}
      onContinue={handleMarkComplete}
      primaryLabel="Mark Setup Complete"
      saving={completeMutation.isPending}
    >
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Review your configuration before marking setup as complete.
        </p>

        {statusLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : (
          <>
            {/* Summary cards grid */}
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryCard
                title="School Units"
                value={
                  units.length > 0
                    ? `${units.length} configured`
                    : "Not configured"
                }
                ready={units.length > 0}
              />
              <SummaryCard
                title="Programmes"
                value={
                  programmes.length > 0
                    ? `${programmes.length} configured`
                    : "Not configured"
                }
                ready={programmes.length > 0}
              />
              <SummaryCard
                title="Grades"
                value={
                  grades.length > 0
                    ? `${grades.length} configured`
                    : "Not configured"
                }
                ready={grades.length > 0}
              />
              <SummaryCard
                title="Academic Year"
                value={activeYear ? activeYear.name : "Not set"}
                ready={!!activeYear}
              />
              <SummaryCard
                title="Classes"
                value={
                  classCount > 0
                    ? `${classCount} classes`
                    : "Not configured"
                }
                ready={classCount > 0}
              />
              <SummaryCard
                title="Subjects"
                value={
                  subjects.length > 0
                    ? `${subjects.length} subjects`
                    : "Not configured"
                }
                ready={subjects.length > 0}
              />
              <SummaryCard
                title="Terms"
                value={
                  terms.length > 0 ? `${terms.length} terms` : "None"
                }
                ready={terms.length > 0}
              />
            </section>

            {/* Non-blocking warnings */}
            {classCount > 0 && (
              <section className="space-y-2">
                <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                  Reminder: assign class teachers after completing setup. Go to{" "}
                  <Link
                    href="/teachers"
                    className="font-medium underline underline-offset-4"
                  >
                    Teachers
                  </Link>{" "}
                  to assign them.
                </div>
                <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                  Holiday calendar not configured. Go to{" "}
                  <Link
                    href="/holidays"
                    className="font-medium underline underline-offset-4"
                  >
                    Holidays
                  </Link>{" "}
                  to add school breaks.
                </div>
              </section>
            )}

            {!canMark && (
              <p className="text-sm text-destructive">
                Complete all required steps (Units, Programmes, Grades, Academic
                Year, Classes, Subjects) before marking setup as complete.
              </p>
            )}
          </>
        )}
      </div>
    </WizardShell>
  );
}
