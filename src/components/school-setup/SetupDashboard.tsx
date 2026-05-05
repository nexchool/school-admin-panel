"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Building2,
  Calendar,
  CalendarRange,
  CheckCircle2,
  CircleDashed,
  Copy,
  GraduationCap,
  Layers,
  Loader2,
  Settings2,
  Upload,
  Wand2,
} from "lucide-react";

import { DuplicateStructureDialog } from "./DuplicateStructureDialog";
import { PromoteYearDialog } from "./PromoteYearDialog";
import { CsvImportDialog } from "./CsvImportDialog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  schoolSetupKeys,
  useCompleteSetup,
  useSetupStatus,
} from "@/hooks/useSchoolSetup";
import { ApiException } from "@/services/api";
import type { SetupStatus } from "@/services/schoolSetupService";
import { cn } from "@/lib/utils";

type ModuleId =
  | "units"
  | "programmes"
  | "grades"
  | "academic_year"
  | "classes"
  | "subjects"
  | "terms";

type CardState = "complete" | "partial" | "empty" | "error" | "optional";

interface ModuleConfig {
  id: ModuleId;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  unit: string;
  href: string;
  optional?: boolean;
}

const MODULES: ModuleConfig[] = [
  {
    id: "units",
    title: "Units",
    description: "Sub-schools / campuses",
    icon: Building2,
    unit: "campuses",
    href: "/school-units",
  },
  {
    id: "programmes",
    title: "Programmes",
    description: "Boards + mediums",
    icon: Layers,
    unit: "programmes",
    href: "/programmes",
  },
  {
    id: "grades",
    title: "Grades",
    description: "Standards your school offers",
    icon: GraduationCap,
    unit: "grades",
    href: "/grades",
  },
  {
    id: "academic_year",
    title: "Academic year",
    description: "Active school year",
    icon: Calendar,
    unit: "years",
    href: "/academics/academic-years",
  },
  {
    id: "classes",
    title: "Classes",
    description: "Sections per grade",
    icon: BookOpen,
    unit: "classes",
    href: "/classes",
  },
  {
    id: "subjects",
    title: "Subjects",
    description: "Per-programme + grade offerings",
    icon: Settings2,
    unit: "offerings",
    href: "/subjects?mode=setup",
  },
  {
    id: "terms",
    title: "Terms",
    description: "Optional split of the year",
    icon: CalendarRange,
    unit: "terms",
    href: "/academics/terms",
    optional: true,
  },
];

function moduleState(
  status: SetupStatus,
  cfg: ModuleConfig,
): { state: CardState; count: number; blockers: string[] } {
  const node = status[cfg.id] as
    | { ready: boolean; count: number; blockers: string[] }
    | undefined;
  if (!node) {
    return { state: "empty", count: 0, blockers: [] };
  }
  const { ready, count, blockers } = node;

  if (cfg.optional) {
    return {
      state: count > 0 ? "complete" : "optional",
      count,
      blockers,
    };
  }
  if (ready) return { state: "complete", count, blockers };
  if (count === 0) return { state: "empty", count, blockers };
  if (blockers.length > 0) return { state: "error", count, blockers };
  return { state: "partial", count, blockers };
}

const STATE_BADGE: Record<
  CardState,
  { label: string; className: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  complete: {
    label: "Complete",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Icon: CheckCircle2,
  },
  partial: {
    label: "Needs attention",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    Icon: AlertTriangle,
  },
  empty: {
    label: "Not started",
    className: "border-border bg-muted text-muted-foreground",
    Icon: CircleDashed,
  },
  error: {
    label: "Action required",
    className: "border-red-200 bg-red-50 text-red-700",
    Icon: AlertCircle,
  },
  optional: {
    label: "Optional",
    className: "border-dashed border-border bg-muted text-muted-foreground",
    Icon: CircleDashed,
  },
};

function formatBlocker(code: string): string {
  return code
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

const MODULE_ORDER_FOR_PROGRESS: ModuleId[] = [
  "units",
  "programmes",
  "grades",
  "academic_year",
  "classes",
  "subjects",
  "terms",
];

export function SetupDashboard() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch, isFetching } = useSetupStatus();
  const completeMut = useCompleteSetup();
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const overall = data?.overall;

  const completeCount = useMemo(() => {
    if (!data) return 0;
    return MODULE_ORDER_FOR_PROGRESS.filter((id) => {
      const node = data[id] as { ready?: boolean; count?: number };
      if (id === "terms") return (node?.count ?? 0) > 0;
      return Boolean(node?.ready);
    }).length;
  }, [data]);

  const onComplete = () => {
    completeMut.mutate(undefined, {
      onSuccess: () => {
        toast.success("School setup marked complete.");
        void qc.invalidateQueries({ queryKey: schoolSetupKeys.status });
      },
      onError: (e) =>
        toast.error(
          e instanceof ApiException
            ? e.message
            : e instanceof Error
              ? e.message
              : "Could not complete setup.",
        ),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading setup…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Setup status unavailable</CardTitle>
          <CardDescription>
            We couldn&rsquo;t reach the setup status service. Try again, and
            contact an administrator if the problem persists.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? "Retrying…" : "Retry"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">School setup</h1>
          <p className="text-sm text-muted-foreground">
            Configure each module to bring your school online. You can come
            back to any card at any time.
          </p>
        </div>
        {overall?.is_setup_complete ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="size-3" />
            Setup complete
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            <AlertTriangle className="size-3" />
            Setup in progress
          </span>
        )}
      </div>

      <Card>
        <CardContent className="space-y-3 py-5">
          <div className="flex items-center gap-1">
            {MODULE_ORDER_FOR_PROGRESS.map((id) => {
              const cfg = MODULES.find((m) => m.id === id)!;
              const { state } = moduleState(data, cfg);
              const color =
                state === "complete"
                  ? "bg-emerald-500"
                  : state === "partial"
                    ? "bg-amber-500"
                    : state === "error"
                      ? "bg-red-500"
                      : "bg-muted";
              return (
                <div
                  key={id}
                  className={cn("h-2 flex-1 rounded-sm", color)}
                  aria-label={`${cfg.title} ${state}`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium">
              {completeCount}/{MODULE_ORDER_FOR_PROGRESS.length} modules complete
            </span>
            {overall?.needs_reconfirm ? (
              <span className="text-amber-700">
                Setup data drifted. Reconfirm setup to mark it complete again.
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((cfg) => {
          const { state, count, blockers } = moduleState(data, cfg);
          const badge = STATE_BADGE[state];
          const BadgeIcon = badge.Icon;
          const Icon = cfg.icon;

          const ctaLabel =
            state === "complete"
              ? "Edit"
              : state === "partial"
                ? "Continue"
                : state === "error"
                  ? "Fix issues"
                  : state === "optional"
                    ? "Add (optional)"
                    : "Set up";

          return (
            <Card
              key={cfg.id}
              role="link"
              tabIndex={0}
              onClick={() => router.push(cfg.href)}
              onKeyDown={(e) => {
                if (e.key === "Enter") router.push(cfg.href);
              }}
              className={cn(
                "flex cursor-pointer flex-col gap-3 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                state === "error" && "border-red-200",
                state === "partial" && "border-amber-200",
                state === "complete" && "border-emerald-200",
                state === "optional" && "border-dashed",
                "hover:shadow-sm",
              )}
            >
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base">{cfg.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {cfg.description}
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 gap-1 text-xs font-medium",
                    badge.className,
                  )}
                >
                  <BadgeIcon className="h-3 w-3" />
                  {badge.label}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3 pt-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tabular-nums">
                    {count}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {cfg.unit}
                  </span>
                </div>

                {blockers.length > 0 ? (
                  <ul className="space-y-1">
                    {blockers.slice(0, 2).map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-1.5 text-xs text-red-700"
                      >
                        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>{formatBlocker(b)}</span>
                      </li>
                    ))}
                    {blockers.length > 2 ? (
                      <li className="text-xs text-muted-foreground">
                        +{blockers.length - 2} more
                      </li>
                    ) : null}
                  </ul>
                ) : null}

                <div className="mt-auto flex items-center justify-end pt-2">
                  <Link
                    href={cfg.href}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    {ctaLabel}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="h-3.5 w-3.5" />
            Import CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setDuplicateOpen(true)}
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate from…
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setPromoteOpen(true)}
          >
            <Wand2 className="h-3.5 w-3.5" />
            Promote year
          </Button>
        </div>
        <Button
          type="button"
          disabled={
            !overall?.ready ||
            completeMut.isPending ||
            (overall?.is_setup_complete && !overall?.needs_reconfirm)
          }
          onClick={onComplete}
        >
          {overall?.is_setup_complete && !overall?.needs_reconfirm
            ? "Setup complete"
            : overall?.needs_reconfirm
              ? "Reconfirm setup"
              : completeMut.isPending
                ? "Saving…"
                : "Complete setup"}
        </Button>
      </div>

      <DuplicateStructureDialog open={duplicateOpen} onOpenChange={setDuplicateOpen} />
      <PromoteYearDialog open={promoteOpen} onOpenChange={setPromoteOpen} />
      <CsvImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
