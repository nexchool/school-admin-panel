"use client";

import Link from "next/link";
import { CheckCircle2, AlertTriangle, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  TeacherGapsResult,
} from "@/services/yearTransitionService";

export interface TransitionCompleteProps {
  fromYearName: string;
  toYearName: string;
  promotionBatchId: string | null;
  promotionSummary: Record<string, unknown> | null;
  isYearActivated: boolean;
  rollovers: {
    timetable?: string | null;
    finance?: string | null;
    transport?: string | null;
    holidays?: string | null;
  };
  teacherGaps: TeacherGapsResult | null;
  onActivateYear: () => void;
  activateLoading: boolean;
  canActivate: boolean;
  onStartAnother: () => void;
}

function summaryNumber(
  summary: Record<string, unknown> | null,
  key: string
): number | null {
  const v = summary?.[key];
  return typeof v === "number" ? v : null;
}

export function TransitionComplete({
  fromYearName,
  toYearName,
  promotionBatchId,
  promotionSummary,
  isYearActivated,
  rollovers,
  teacherGaps,
  onActivateYear,
  activateLoading,
  canActivate,
  onStartAnother,
}: TransitionCompleteProps) {
  const totals = {
    promoted: summaryNumber(promotionSummary, "promoted"),
    repeated: summaryNumber(promotionSummary, "repeated"),
    graduated: summaryNumber(promotionSummary, "graduated"),
    skipped: summaryNumber(promotionSummary, "skipped"),
    total: summaryNumber(promotionSummary, "total_enrollments"),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          Transition complete — {fromYearName} → {toYearName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Promotion totals */}
        <section>
          <h3 className="text-sm font-semibold">Promotion summary</h3>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: "Promoted", value: totals.promoted },
              { label: "Repeated", value: totals.repeated },
              { label: "Graduated", value: totals.graduated },
              { label: "Skipped", value: totals.skipped },
              { label: "Total", value: totals.total },
            ].map((it) => (
              <div
                key={it.label}
                className="rounded-md border bg-muted/30 px-3 py-2 text-center"
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {it.label}
                </p>
                <p className="text-lg font-semibold">{it.value ?? "—"}</p>
              </div>
            ))}
          </div>
          {promotionBatchId && (
            <p className="mt-2 text-xs text-muted-foreground">
              Batch id:{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                {promotionBatchId}
              </code>
            </p>
          )}
        </section>

        {/* Activate */}
        <section className="rounded-md border bg-muted/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Active academic year</h3>
              <p className="text-xs text-muted-foreground">
                {isYearActivated
                  ? `${toYearName} is now the active year.`
                  : `Currently still pointing at the previous year. Activate to make ${toYearName} the school-wide default.`}
              </p>
            </div>
            <Button
              size="sm"
              onClick={onActivateYear}
              disabled={!canActivate || activateLoading || isYearActivated}
            >
              {isYearActivated ? "Active" : activateLoading ? "Activating…" : `Activate ${toYearName}`}
            </Button>
          </div>
        </section>

        {/* Rollover summaries */}
        <section>
          <h3 className="text-sm font-semibold">Rollover summary</h3>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            <li>
              Timetable:{" "}
              <span className="text-foreground">
                {rollovers.timetable ?? "skipped"}
              </span>
            </li>
            <li>
              Fee structures:{" "}
              <span className="text-foreground">
                {rollovers.finance ?? "skipped"}
              </span>
            </li>
            <li>
              Transport:{" "}
              <span className="text-foreground">
                {rollovers.transport ?? "skipped"}
              </span>
            </li>
            <li>
              Holidays:{" "}
              <span className="text-foreground">
                {rollovers.holidays ?? "skipped"}
              </span>
            </li>
          </ul>
        </section>

        {/* Teacher gaps */}
        {teacherGaps && (
          <section className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
              <div className="space-y-2 text-xs">
                <p className="font-semibold text-amber-700">
                  Teacher assignments to review
                </p>
                <p>
                  {teacherGaps.totals.classes_missing_class_teacher} class(es)
                  in {toYearName} have no class teacher;{" "}
                  {teacherGaps.totals.class_subjects_missing_primary_teacher}{" "}
                  class-subject offering(s) have no primary teacher.
                </p>
                <p className="text-muted-foreground">
                  Open each class to assign a class teacher and review subject
                  assignments.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Checklist */}
        <section>
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Next steps</h3>
          </div>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">
            <li>
              <Link
                href="/timetable"
                className="text-primary underline-offset-4 hover:underline"
              >
                Review and publish timetables
              </Link>{" "}
              for new classes (rollover creates draft versions).
            </li>
            <li>
              <Link
                href="/dashboard/finance/structures"
                className="text-primary underline-offset-4 hover:underline"
              >
                Verify fee structures
              </Link>{" "}
              for {toYearName} and adjust amounts if needed.
            </li>
            <li>
              <Link
                href="/dashboard/finance/student-fees"
                className="text-primary underline-offset-4 hover:underline"
              >
                Generate student fees
              </Link>{" "}
              once fee structures look correct.
            </li>
            <li>
              <Link
                href="/dashboard/transport/enrollments"
                className="text-primary underline-offset-4 hover:underline"
              >
                Review transport enrollments
              </Link>{" "}
              — promoted students keep their old route by default.
            </li>
            <li>
              <Link
                href="/holidays"
                className="text-primary underline-offset-4 hover:underline"
              >
                Verify holidays
              </Link>{" "}
              for the new academic calendar.
            </li>
          </ul>
        </section>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/academics/year-transition/history">
              View transition history
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={onStartAnother}>
            Start another transition
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
