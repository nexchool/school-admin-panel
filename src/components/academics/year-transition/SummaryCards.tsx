"use client";

import type { PromotionPreviewSummary } from "@/services/yearTransitionService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Ban,
  GraduationCap,
  HelpCircle,
  Users,
  UserPlus,
} from "lucide-react";

export function SummaryCards({
  summary,
}: {
  summary: PromotionPreviewSummary | null;
}) {
  if (!summary) {
    return (
      <p className="text-sm text-muted-foreground">
        Run preview to see promotion counts.
      </p>
    );
  }

  const noStudentsInYear =
    summary.total_enrollments === 0 &&
    summary.promotable === 0 &&
    summary.graduated === 0 &&
    summary.unmapped === 0 &&
    summary.blocked_double_promotion === 0;

  const legacyOnly = summary.legacy_placement_only_rows ?? 0;

  const items = [
    {
      title: "Total enrollments",
      value: summary.total_enrollments,
      icon: Users,
      variant: "default" as const,
    },
    {
      title: "Promotable",
      value: summary.promotable,
      icon: UserPlus,
      variant: "default" as const,
    },
    {
      title: "Graduated",
      value: summary.graduated,
      icon: GraduationCap,
      variant: "default" as const,
    },
    {
      title: "Unmapped",
      value: summary.unmapped,
      icon: HelpCircle,
      variant: summary.unmapped > 0 ? ("destructive" as const) : ("default" as const),
    },
    {
      title: "Blocked",
      value: summary.blocked_double_promotion,
      icon: Ban,
      variant:
        summary.blocked_double_promotion > 0
          ? ("destructive" as const)
          : ("default" as const),
    },
  ];

  return (
    <div className="space-y-3">
      {noStudentsInYear ? (
        <p
          className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
          role="status"
        >
          No students found for the selected <strong>from</strong> academic year. Use
          the current year you are promoting <em>from</em> in step 1 (e.g. 2026–2027),
          and ensure each student has a class in that year.
        </p>
      ) : null}
      {legacyOnly > 0 ? (
        <p className="text-xs text-muted-foreground" role="note">
          {legacyOnly} student(s) are on a class roster for this year but had no
          enrollment history row; they are included in these counts. Run{" "}
          <code className="rounded bg-muted px-1">reconcile_student_class_enrollments</code>{" "}
          to backfill enrollment records if you want full history.
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {items.map(({ title, value, icon: Icon, variant }) => (
          <Card
            key={title}
            className={
              variant === "destructive"
                ? "border-destructive/50 bg-destructive/5"
                : undefined
            }
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {title}
              </CardTitle>
              <Icon
                className={
                  variant === "destructive"
                    ? "h-4 w-4 text-destructive"
                    : "h-4 w-4 text-muted-foreground"
                }
              />
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-semibold ${
                  variant === "destructive" ? "text-destructive" : ""
                }`}
              >
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
