import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Shared with any list page that shows a row of "N of X" summary tiles above
 * its table (Classes, Departments, ...). Keep tone additions here in sync
 * across every consumer rather than growing a page-local copy.
 */
const TONE_CLASSES = {
  primary: "bg-primary/10 text-primary ring-1 ring-primary/20",
  info: "bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20 dark:text-sky-400",
  warning: "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400",
  success: "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400",
} as const;

export type StatCardTone = keyof typeof TONE_CLASSES;

export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | undefined;
  sub: string;
  tone: StatCardTone;
  loading: boolean;
}

export function StatCard({ icon: Icon, label, value, sub, tone, loading }: StatCardProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center gap-4 pt-5">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            TONE_CLASSES[tone]
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {loading ? (
            <div className="mt-1 h-7 w-16 animate-pulse rounded bg-muted" />
          ) : (
            <p className="mt-0.5 text-2xl font-bold tracking-tight tabular-nums">
              {value?.toLocaleString() ?? 0}
            </p>
          )}
          <p className="truncate text-xs text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}
