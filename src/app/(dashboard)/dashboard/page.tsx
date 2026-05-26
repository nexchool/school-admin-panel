"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  Bus,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Dot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useDashboard } from "@/hooks/useDashboard";
import type { DashboardAlerts, DashboardData } from "@/services/dashboardService";
import { SetupStatusPill } from "@/components/school-setup/SetupStatusPill";
import { SubscriptionWidgets } from "@/components/subscription/SubscriptionWidgets";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function fmtShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function timeAgo(isoString: string | null): string | null {
  if (!isoString) return null;
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return "today";
}

type AlertSeverity = "warn" | "critical";

function severity(count: number): AlertSeverity {
  return count <= 3 ? "warn" : "critical";
}

// ─── alert definitions ───────────────────────────────────────────────────────

interface AlertItemDef {
  key: keyof Omit<DashboardAlerts, "total_issues">;
  title: string;
  href: string;
}

const ALERT_DEFS: AlertItemDef[] = [
  { key: "timetable_conflicts",       title: "Timetable conflicts",       href: "/timetable" },
  { key: "classes_without_timetable", title: "Classes without timetable", href: "/timetable" },
  { key: "subjects_without_teacher",  title: "Subjects unassigned",       href: "/classes" },
  { key: "classes_without_subjects",  title: "Classes without subjects",  href: "/classes" },
  { key: "students_without_class",    title: "Students without class",    href: "/students" },
  { key: "overdue_fees_students",     title: "Overdue fee students",      href: "/dashboard/finance" },
  { key: "transport_issues",          title: "Transport issues",          href: "/dashboard/transport" },
];

// ─── sub-components ──────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1 tracking-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="rounded-xl bg-muted p-3">
            <Icon className="size-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color =
    pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-red-500";
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function HealthBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : score >= 50
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-red-50 text-red-700 border-red-200";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${color}`}
    >
      <span
        className={`size-1.5 rounded-full ${
          score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-400" : "bg-red-500"
        }`}
      />
      Health {score}%
    </span>
  );
}

function AlertsSection({ alerts }: { alerts: DashboardAlerts }) {
  const visible = ALERT_DEFS.filter((d) => alerts[d.key] > 0);

  if (visible.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-500" />
            Attention Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="size-4 flex-shrink-0" />
            All systems running smoothly
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber-500" />
          Attention Required
          <Badge variant="destructive" className="ml-auto text-xs font-semibold">
            {visible.length} issue{visible.length !== 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-1.5">
          {visible.map((def) => {
            const count = alerts[def.key];
            const sev = severity(count);
            const isWarn = sev === "warn";
            return (
              <Link key={def.key} href={def.href} className="block">
                <div
                  className={`group flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm font-medium cursor-pointer transition-colors ${
                    isWarn
                      ? "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
                      : "bg-red-50 border-red-200 text-red-800 hover:bg-red-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`size-1.5 rounded-full flex-shrink-0 ${
                        isWarn ? "bg-amber-400" : "bg-red-500"
                      }`}
                    />
                    {def.title}
                  </div>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                      isWarn ? "bg-amber-200 text-amber-900" : "bg-red-200 text-red-900"
                    }`}
                  >
                    {count}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboard();

  if (isLoading) return <DashboardSkeleton />;
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <XCircle className="size-8 text-red-400" />
        <p className="text-sm">Failed to load dashboard. Please refresh.</p>
      </div>
    );
  }

  return <DashboardContent data={data} />;
}

function DashboardContent({ data }: { data: DashboardData }) {
  const { overview, today, alerts, finance, transport, actions, health_score } = data;

  const updatedAgo = timeAgo(today.last_attendance_marked_at);

  return (
    <div className="space-y-7 pb-10">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {overview.academic_year} &middot; Live school overview
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <SetupStatusPill />
          <HealthBadge score={health_score} />
          {alerts.total_issues > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
              <AlertTriangle className="size-3" />
              {alerts.total_issues} issue{alerts.total_issues !== 1 ? "s" : ""} need attention
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="size-3" />
              Running smoothly
            </span>
          )}
        </div>
      </div>

      {/* ── 1a. Subscription health ────────────────────────────────────── */}
      <SubscriptionWidgets />

      {/* ── 1. Overview stats ───────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={GraduationCap} label="Students"      value={overview.total_students} sub="Total enrolled" />
        <StatCard icon={Users}         label="Teachers"      value={overview.total_teachers} sub="Active staff" />
        <StatCard icon={BookOpen}      label="Classes"       value={overview.total_classes}  sub="Active classes" />
        <StatCard icon={Calendar}      label="Academic Year" value={overview.academic_year} />
      </div>

      {/* ── 2. Today + Alerts ───────────────────────────────────────────── */}
      <div className={`grid gap-4 ${today.enabled === false ? "" : "lg:grid-cols-2"}`}>
        {/* Today's operations — hidden when attendance feature is off */}
        {today.enabled === false ? null : (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="size-4 text-blue-500" />
                Today&apos;s Operations
              </CardTitle>
              {updatedAgo && (
                <span className="text-xs text-muted-foreground">
                  Last updated {updatedAgo}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Lectures</p>
                <p className="text-2xl font-bold">{today.lectures_today}</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Classes</p>
                <p className="text-2xl font-bold">
                  {today.attendance_marked_classes}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{today.total_classes}
                  </span>
                </p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Overrides</p>
                <p className="text-2xl font-bold">{today.schedule_overrides_count}</p>
              </div>
            </div>

            {/* Attendance completion */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Attendance completion</span>
                <span className="font-bold tabular-nums">
                  {today.attendance_completion_percentage.toFixed(0)}%
                </span>
              </div>
              <ProgressBar value={today.attendance_completion_percentage} />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {today.attendance_marked_classes} of {today.total_classes} classes marked
                </span>
                {today.pending_attendance_classes > 0 ? (
                  <Link href="/attendance">
                    <span className="font-semibold text-red-500 cursor-pointer hover:underline">
                      {today.pending_attendance_classes} pending →
                    </span>
                  </Link>
                ) : (
                  <span className="font-medium text-emerald-600">All marked ✓</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Alerts */}
        <AlertsSection alerts={alerts} />
      </div>

      {/* ── 3. Finance ──────────────────────────────────────────────────── */}
      {finance.enabled === false ? null : (
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Finance snapshot */}
        <Card className="shadow-sm lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wallet className="size-4 text-violet-500" />
              Finance Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Collected / Expected */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Collected</span>
                <span className="font-bold text-emerald-600">
                  {fmt(finance.total_collected)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Expected</span>
                <span className="font-medium">{fmt(finance.total_expected)}</span>
              </div>
              <ProgressBar value={finance.collection_percentage} />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {finance.collection_percentage.toFixed(1)}% collected
                </span>
                {/* Trend indicator */}
                <TrendChip pct={finance.trend_percentage} />
              </div>
            </div>

            {/* Outstanding + Overdue */}
            <div className="rounded-xl bg-muted/50 p-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Outstanding</span>
                <span className="font-semibold text-amber-600">
                  {fmt(finance.total_outstanding)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overdue students</span>
                <Link href="/dashboard/finance">
                  <span
                    className={`font-semibold cursor-pointer hover:underline ${
                      finance.overdue_count > 0 ? "text-red-500" : "text-muted-foreground"
                    }`}
                  >
                    {finance.overdue_count}
                  </span>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 7-day collection trend chart */}
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="size-4 text-violet-500" />
                Fee Collection — Last 7 Days
              </CardTitle>
              <TrendChip pct={finance.trend_percentage} />
            </div>
          </CardHeader>
          <CardContent>
            <FinanceTrendChart data={finance.last_7_days_collection} />
          </CardContent>
        </Card>
      </div>
      )}

      {/* ── 4. Transport + Pending actions ──────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Transport */}
        {transport.enabled ? (
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bus className="size-4 text-sky-500" />
                Transport
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-muted/50 p-3 text-center">
                  <p className="text-2xl font-bold">{transport.active_buses}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    of {transport.total_buses} buses active
                  </p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3 text-center">
                  <p className="text-2xl font-bold">{transport.students_on_transport}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Students enrolled</p>
                </div>
                <div
                  className={`rounded-xl p-3 text-center ${
                    (transport.buses_near_capacity ?? 0) > 0
                      ? "bg-amber-50 border border-amber-200"
                      : "bg-muted/50"
                  }`}
                >
                  <p
                    className={`text-2xl font-bold ${
                      (transport.buses_near_capacity ?? 0) > 0 ? "text-amber-600" : ""
                    }`}
                  >
                    {transport.buses_near_capacity}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Near capacity</p>
                </div>
              </div>

              {(transport.students_on_inactive_routes ?? 0) > 0 && (
                <Link href="/dashboard/transport" className="block">
                  <div className="flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700 cursor-pointer hover:bg-red-100 transition-colors">
                    <span className="size-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    {transport.students_on_inactive_routes} student
                    {(transport.students_on_inactive_routes ?? 0) !== 1 ? "s" : ""} on
                    inactive routes — action required
                  </div>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm opacity-50">
            <CardContent className="pt-5 flex items-center gap-3 text-muted-foreground text-sm">
              <Bus className="size-5" />
              Transport module is not enabled for this plan.
            </CardContent>
          </Card>
        )}

        {/* Pending actions */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Pending Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Leave requests */}
            <Link href="/teachers" className="block">
              <div
                className={`flex items-center justify-between rounded-xl px-3.5 py-3 cursor-pointer transition-colors ${
                  actions.pending_leave_requests > 0
                    ? "bg-amber-50 border border-amber-200 hover:bg-amber-100"
                    : "bg-muted/50 hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="size-4 text-muted-foreground" />
                  Leave requests
                </div>
                <Badge
                  variant={actions.pending_leave_requests > 0 ? "destructive" : "secondary"}
                >
                  {actions.pending_leave_requests}
                </Badge>
              </div>
            </Link>

            {/* Upcoming holidays */}
            {actions.upcoming_holidays.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 pt-1">
                  Upcoming Holidays
                </p>
                {actions.upcoming_holidays.map((h) => (
                  <Link key={`${h.name}-${h.date}`} href="/holidays" className="block">
                    <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3.5 py-2.5 cursor-pointer hover:bg-muted transition-colors">
                      <span className="text-sm font-medium">{h.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {fmtShortDate(h.date)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground px-1">
                No upcoming holidays in the near term.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── trend chip ──────────────────────────────────────────────────────────────

function TrendChip({ pct }: { pct: number }) {
  if (pct === 0) return null;
  const positive = pct > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        positive
          ? "bg-emerald-50 text-emerald-700"
          : "bg-red-50 text-red-700"
      }`}
    >
      {positive ? (
        <TrendingUp className="size-3" />
      ) : (
        <TrendingDown className="size-3" />
      )}
      {positive ? "+" : ""}
      {pct.toFixed(1)}% vs last week
    </span>
  );
}

// ─── finance trend chart ──────────────────────────────────────────────────────

function FinanceTrendChart({
  data,
}: {
  data: { date: string; amount: number }[];
}) {
  const chartData = data.map((d) => ({
    ...d,
    label: fmtShortDate(d.date),
  }));

  const hasData = data.some((d) => d.amount > 0);

  if (!hasData) {
    return (
      <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
        No fee collections in the last 7 days.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={168}>
      <AreaChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="financeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => fmt(v)}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          width={55}
        />
        <Tooltip
          formatter={(value) => [fmt(Number(value ?? 0)), "Collected"]}
          labelFormatter={(label) => label}
          labelStyle={{ fontSize: 12, fontWeight: 600 }}
          contentStyle={{
            fontSize: 12,
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.06)",
          }}
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="#8b5cf6"
          strokeWidth={2}
          fill="url(#financeGradient)"
          dot={(props) => {
            const { cx, cy, payload } = props as { cx: number; cy: number; payload: { amount: number } };
            return (
              <Dot
                key={`dot-${cx}-${cy}`}
                cx={cx}
                cy={cy}
                r={payload.amount === 0 ? 2.5 : 3.5}
                fill={payload.amount === 0 ? "#cbd5e1" : "#8b5cf6"}
                stroke="white"
                strokeWidth={1.5}
              />
            );
          }}
          activeDot={{ r: 5, fill: "#8b5cf6", stroke: "white", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-7 pb-10">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-7 w-40 rounded-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="pt-5">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="pt-5">
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <Skeleton className="h-52 w-full" />
          </CardContent>
        </Card>
        <Card className="shadow-sm lg:col-span-2">
          <CardContent className="pt-5">
            <Skeleton className="h-52 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
