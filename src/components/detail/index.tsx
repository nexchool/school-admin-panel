"use client";

import Link from "next/link";
import { useMemo, type ComponentType, type ReactNode } from "react";
import { ArrowLeft, Pencil, Trash2, type LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// ProfileHeader
// ---------------------------------------------------------------------------

export interface ProfileHeaderBadge {
  label: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
  icon?: LucideIcon;
}

export interface ProfileHeaderProps {
  name: string;
  subtitle?: string;
  profilePicture?: string | null;
  /** Optional icon shown inside the avatar circle instead of initials. */
  avatarIcon?: LucideIcon;
  badges?: ProfileHeaderBadge[];
  backHref: string;
  backLabel: string;
  onEdit?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
  extraActions?: ReactNode;
}

export function ProfileHeader({
  name,
  subtitle,
  profilePicture,
  avatarIcon: AvatarIcon,
  badges = [],
  backHref,
  backLabel,
  onEdit,
  onDelete,
  isDeleting,
  extraActions,
}: ProfileHeaderProps) {
  const initials = useMemo(() => getInitials(name), [name]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link href={backHref}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <span className="text-sm text-muted-foreground">{backLabel}</span>
      </div>

      <Card>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div className="flex min-w-0 gap-4">
            <Avatar className="size-16 shrink-0 ring-1 ring-border">
              {profilePicture && (
                <AvatarImage src={profilePicture} alt={name} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {AvatarIcon ? (
                  <AvatarIcon className="size-7" />
                ) : (
                  initials
                )}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-2">
              <div className="space-y-0.5">
                <h1 className="truncate text-2xl font-semibold leading-tight tracking-tight">
                  {name}
                </h1>
                {subtitle && (
                  <p className="truncate text-sm text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </div>
              {badges.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {badges.map((badge) => {
                    const Icon = badge.icon;
                    return (
                      <Badge
                        key={badge.label}
                        variant={badge.variant ?? "secondary"}
                        className={Icon ? "gap-1" : undefined}
                      >
                        {Icon && <Icon className="size-3" />}
                        {badge.label}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 sm:self-start">
            {extraActions}
            {onEdit && (
              <Button variant="outline" onClick={onEdit} className="gap-2">
                <Pencil className="size-4" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="destructive"
                onClick={onDelete}
                disabled={isDeleting}
                className="gap-2"
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EntityHeader (for non-person entities: classes, subjects, buses, etc.)
// ---------------------------------------------------------------------------

export interface EntityHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  badges?: ProfileHeaderBadge[];
  backHref: string;
  backLabel: string;
  onEdit?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
  extraActions?: ReactNode;
  /** Tone for the icon tile. Defaults to "primary". */
  iconTone?: "primary" | "info" | "warning" | "success" | "neutral";
}

export function EntityHeader({
  icon: Icon,
  title,
  subtitle,
  badges = [],
  backHref,
  backLabel,
  onEdit,
  onDelete,
  isDeleting,
  extraActions,
  iconTone = "primary",
}: EntityHeaderProps) {
  const tileClasses: Record<NonNullable<EntityHeaderProps["iconTone"]>, string> = {
    primary: "bg-primary/10 text-primary ring-1 ring-primary/20",
    info: "bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20 dark:text-sky-400",
    warning:
      "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400",
    success:
      "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400",
    neutral: "bg-muted text-foreground ring-1 ring-border",
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link href={backHref}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <span className="text-sm text-muted-foreground">{backLabel}</span>
      </div>

      <Card>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div className="flex min-w-0 gap-4">
            <div
              className={cn(
                "flex size-14 shrink-0 items-center justify-center rounded-lg",
                tileClasses[iconTone]
              )}
            >
              <Icon className="size-7" />
            </div>
            <div className="min-w-0 space-y-2">
              <div className="space-y-0.5">
                <h1 className="truncate text-2xl font-semibold leading-tight tracking-tight">
                  {title}
                </h1>
                {subtitle && (
                  <p className="truncate text-sm text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </div>
              {badges.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {badges.map((badge) => {
                    const BadgeIcon = badge.icon;
                    return (
                      <Badge
                        key={badge.label}
                        variant={badge.variant ?? "secondary"}
                        className={BadgeIcon ? "gap-1" : undefined}
                      >
                        {BadgeIcon && <BadgeIcon className="size-3" />}
                        {badge.label}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 sm:self-start">
            {extraActions}
            {onEdit && (
              <Button variant="outline" onClick={onEdit} className="gap-2">
                <Pencil className="size-4" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="destructive"
                onClick={onDelete}
                disabled={isDeleting}
                className="gap-2"
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// QuickStats
// ---------------------------------------------------------------------------

export interface QuickStatItem {
  icon: LucideIcon;
  label: string;
  value?: string | number | null;
}

export function QuickStats({ items }: { items: QuickStatItem[] }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3",
        items.length >= 6
          ? "lg:grid-cols-6"
          : items.length === 5
          ? "lg:grid-cols-5"
          : "lg:grid-cols-4"
      )}
    >
      {items.map((item) => {
        const display =
          item.value == null || item.value === "" ? "—" : String(item.value);
        return (
          <div
            key={item.label}
            className="rounded-lg border border-border bg-card p-3"
          >
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <item.icon className="size-3.5" />
              {item.label}
            </div>
            <p className="mt-1 truncate text-sm font-semibold">{display}</p>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TabNav
// ---------------------------------------------------------------------------

export interface TabNavItem<T extends string> {
  id: T;
  label: string;
  icon: LucideIcon;
  /** Optional count badge. Only rendered when value is a truthy number/string. */
  badge?: number | string;
  /** Visual tone of the badge when the tab is inactive. Defaults to "default". */
  badgeTone?: "default" | "destructive";
}

interface TabNavProps<T extends string> {
  tabs: TabNavItem<T>[];
  active: T;
  onChange: (id: T) => void;
}

export function TabNav<T extends string>({
  tabs,
  active,
  onChange,
}: TabNavProps<T>) {
  return (
    <div className="overflow-x-auto">
      <div
        role="tablist"
        className="inline-flex min-w-full items-center gap-1 rounded-lg border border-border bg-muted/60 p-1"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          const Icon = tab.icon;
          const showBadge =
            tab.badge != null &&
            tab.badge !== "" &&
            !(typeof tab.badge === "number" && tab.badge === 0);
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3.5 py-1.5 text-sm font-medium transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {tab.label}
              {showBadge && (
                <span
                  className={cn(
                    "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : tab.badgeTone === "destructive"
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-foreground/10 text-foreground"
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SectionCard + DetailTable
// ---------------------------------------------------------------------------

export function SectionCard({
  title,
  description,
  icon: Icon,
  children,
  className,
  actions,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            {Icon && <Icon className="size-4 text-muted-foreground" />}
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export type DetailRow = [label: string, value: ReactNode];

export function DetailTable({ rows }: { rows: DetailRow[] }) {
  const filled = rows.filter(([, v]) => {
    if (v == null || v === false) return false;
    if (typeof v === "string") return v !== "";
    if (typeof v === "number") return !Number.isNaN(v);
    return true;
  });
  if (filled.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No information available.
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <dl className="divide-y divide-border">
        {filled.map(([label, value], idx) => (
          <div
            key={label}
            className={cn(
              "grid grid-cols-[40%_60%] gap-3 px-3 py-2.5 text-sm sm:grid-cols-[35%_65%]",
              idx % 2 === 1 && "bg-muted/40"
            )}
          >
            <dt className="font-medium text-muted-foreground">{label}</dt>
            <dd className="break-words text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ComingSoonCard
// ---------------------------------------------------------------------------

export function ComingSoonCard({
  title,
  description,
  icon: Icon,
  className,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">{title}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant="outline" className="mt-1">
          Coming soon
        </Badge>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// InfoBanner (warning / info / success)
// ---------------------------------------------------------------------------

export function InfoBanner({
  tone = "info",
  title,
  description,
  icon: Icon,
  actions,
  className,
}: {
  tone?: "info" | "warning" | "success";
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
}) {
  const toneClasses: Record<string, string> = {
    info: "border-primary/30 bg-primary/5 text-foreground",
    warning:
      "border-amber-500/40 bg-amber-500/10 text-foreground dark:border-amber-400/30 dark:bg-amber-400/10",
    success: "border-emerald-500/40 bg-emerald-500/10 text-foreground",
  };
  const iconClasses: Record<string, string> = {
    info: "text-primary",
    warning: "text-amber-600 dark:text-amber-400",
    success: "text-emerald-600 dark:text-emerald-400",
  };
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start",
        toneClasses[tone],
        className
      )}
      role={tone === "warning" ? "alert" : "note"}
    >
      {Icon && (
        <Icon
          className={cn("mt-0.5 size-5 shrink-0", iconClasses[tone])}
          aria-hidden
        />
      )}
      <div className="flex-1 space-y-1">
        <p className="font-medium">{title}</p>
        {description && (
          <div className="text-sm text-muted-foreground">{description}</div>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getInitials(name: string): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatDate(value?: string | null): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatCurrency(value?: number | null): string | undefined {
  if (value == null) return undefined;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return value.toString();
  }
}

export function formatBool(value?: boolean | null): string | undefined {
  if (value == null) return undefined;
  return value ? "Yes" : "No";
}

export function getStatusVariant(
  status?: string
): "default" | "secondary" | "destructive" | "outline" {
  if (!status) return "outline";
  const s = status.toLowerCase();
  if (["active", "enrolled", "promoted"].includes(s)) return "default";
  if (["inactive", "graduated", "transferred", "on_leave", "on-leave"].includes(s))
    return "secondary";
  if (["suspended", "expelled", "dropped", "terminated"].includes(s))
    return "destructive";
  return "outline";
}

// Re-export type helper to simplify props typing in pages.
export type IconType = ComponentType<{ className?: string }>;
