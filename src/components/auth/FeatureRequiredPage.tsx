"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { useAuth } from "@/components/providers";

interface FeatureRequiredPageProps {
  feature: string;
  /** User-facing label, e.g. "Transport" — defaults to a humanised feature key. */
  label?: string;
  children: ReactNode;
}

const DEFAULT_LABELS: Record<string, string> = {
  attendance: "Attendance",
  fees_management: "Fees & finance",
  timetable: "Timetable",
  schedule_management: "Schedule",
  transport: "Transport",
  notifications: "Notifications",
  holiday_management: "Holidays",
  library: "Library",
  hostel: "Hostel",
  inventory: "Inventory",
  examinations: "Examinations",
  reports: "Reports",
};

/**
 * Page-level guard. Renders the page when its feature is enabled, otherwise
 * shows a friendly "feature disabled" panel with a link back to the
 * dashboard. Wraps the entire page content so direct URL access works
 * predictably and the API calls those pages would make are skipped.
 */
export function FeatureRequiredPage({ feature, label, children }: FeatureRequiredPageProps) {
  const { isFeatureEnabled } = useAuth();
  if (isFeatureEnabled(feature)) return <>{children}</>;

  const featureLabel = label ?? DEFAULT_LABELS[feature] ?? feature;
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Feature unavailable
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          {featureLabel} is disabled for your school
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This module has been turned off by the platform administrator. If
          you need access, please contact support.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
